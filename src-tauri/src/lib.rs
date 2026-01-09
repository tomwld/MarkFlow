use tauri::menu::{Menu, MenuItem, Submenu, PredefinedMenuItem};
use tauri::{Emitter, AppHandle, Wry};

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct MenuLabels {
    file: String,
    new: String,
    open: String,
    open_folder: String,
    save: String,
    save_as: String,
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
        }
    }
}

fn build_menu(handle: &AppHandle, labels: &MenuLabels) -> tauri::Result<Menu<Wry>> {
    // File Menu
    let new_i = MenuItem::with_id(handle, "file-new", &labels.new, true, Some("CmdOrCtrl+N"))?;
    let open_i = MenuItem::with_id(handle, "file-open", &labels.open, true, Some("CmdOrCtrl+O"))?;
    let open_folder_i = MenuItem::with_id(handle, "file-open-folder", &labels.open_folder, true, Some("CmdOrCtrl+Shift+O"))?;
    let save_i = MenuItem::with_id(handle, "file-save", &labels.save, true, Some("CmdOrCtrl+S"))?;
    let save_as_i = MenuItem::with_id(handle, "file-save-as", &labels.save_as, true, Some("CmdOrCtrl+Shift+S"))?;
    let close_i = MenuItem::with_id(handle, "file-close", &labels.close, true, Some("CmdOrCtrl+W"))?;
    let quit_i = PredefinedMenuItem::quit(handle, Some(&labels.quit))?;
    
    let file_menu = Submenu::with_items(handle, &labels.file, true, &[
        &new_i, &open_i, &open_folder_i, &save_i, &save_as_i, &close_i, &quit_i
    ])?;

    // Edit Menu
    let undo_i = PredefinedMenuItem::undo(handle, Some(&labels.undo))?;
    let redo_i = PredefinedMenuItem::redo(handle, Some(&labels.redo))?;
    let cut_i = PredefinedMenuItem::cut(handle, Some(&labels.cut))?;
    let copy_i = PredefinedMenuItem::copy(handle, Some(&labels.copy))?;
    let paste_i = PredefinedMenuItem::paste(handle, Some(&labels.paste))?;
    let select_all_i = PredefinedMenuItem::select_all(handle, Some(&labels.select_all))?;
    
    let edit_menu = Submenu::with_items(handle, &labels.edit, true, &[
        &undo_i, &redo_i, &cut_i, &copy_i, &paste_i, &select_all_i
    ])?;
    
    // View Menu
    let toggle_sidebar_i = MenuItem::with_id(handle, "view-toggle-sidebar", &labels.toggle_sidebar, true, Some("CmdOrCtrl+B"))?;
    let toggle_outline_i = MenuItem::with_id(handle, "view-toggle-outline", &labels.toggle_outline, true, Some("CmdOrCtrl+Shift+B"))?;
    let preview_i = MenuItem::with_id(handle, "view-toggle-preview", &labels.toggle_preview, true, Some("CmdOrCtrl+P"))?;
    let theme_i = MenuItem::with_id(handle, "view-toggle-theme", &labels.toggle_theme, true, None::<&str>)?;
    let focus_i = MenuItem::with_id(handle, "view-toggle-focus", &labels.toggle_focus, true, None::<&str>)?;
    let settings_i = MenuItem::with_id(handle, "view-settings", &labels.settings, true, Some("CmdOrCtrl+,"))?;
    
    let view_menu = Submenu::with_items(handle, &labels.view, true, &[
        &toggle_sidebar_i, &toggle_outline_i, &preview_i, &theme_i, &focus_i, &settings_i
    ])?;

    // Help Menu
    let about_i = MenuItem::with_id(handle, "help-about", &labels.about, true, None::<&str>)?;
    
    let help_menu = Submenu::with_items(handle, &labels.help, true, &[
        &about_i
    ])?;

    let menu = Menu::with_items(handle, &[
        &file_menu, &edit_menu, &view_menu, &help_menu
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let handle = app.handle();
            let labels = MenuLabels::default();
            let menu = build_menu(handle, &labels)?;
            app.set_menu(menu)?;
            Ok(())
        })
        .on_menu_event(|app, event| {
            let event_id = event.id.as_ref();
            // Emit event to frontend
             let _ = app.emit("menu-event", event_id);
        })
        .invoke_handler(tauri::generate_handler![greet, update_menu]);


    if let Err(err) = builder.run(tauri::generate_context!()) {
        eprintln!("Error while running tauri application: {}", err);
    }
}
