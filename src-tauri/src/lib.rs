use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;

fn db_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("gold-ledger.db"))
}

fn validate_sqlite(path: &Path) -> Result<(), String> {
    if !path.exists() {
        return Err("ဖိုင်မရှိပါ".into());
    }
    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    if bytes.len() < 16 || &bytes[0..15] != b"SQLite format 3" {
        return Err("SQLite ဒေတာဖိုင် မဟုတ်ပါ".into());
    }
    // Soft schema check
    let conn = rusqlite::Connection::open(path).map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('customers','prices','txns','settings')",
        )
        .map_err(|e| e.to_string())?;
    let names: Vec<String> = stmt
        .query_map([], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();
    for need in ["customers", "prices", "txns", "settings"] {
        if !names.iter().any(|n| n == need) {
            return Err(format!("ဒေတာဖိုင် မပြည့်စုံပါ ({need} မရှိ)"));
        }
    }
    Ok(())
}

#[tauri::command]
fn backup_database(app: tauri::AppHandle, dest: String) -> Result<(), String> {
    let src = db_path(&app)?;
    if !src.exists() {
        return Err("ဒေတာဖိုင် မရှိသေးပါ".into());
    }
    fs::copy(&src, &dest).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn restore_database(app: tauri::AppHandle, src: String) -> Result<(), String> {
    let src_path = PathBuf::from(&src);
    validate_sqlite(&src_path)?;
    let dest = db_path(&app)?;
    // Replace with a temp copy then rename for safety
    let tmp = dest.with_extension("db.tmp");
    fs::copy(&src_path, &tmp).map_err(|e| e.to_string())?;
    if dest.exists() {
        let bak = dest.with_extension("db.bak");
        let _ = fs::remove_file(&bak);
        fs::rename(&dest, &bak).map_err(|e| e.to_string())?;
    }
    fs::rename(&tmp, &dest).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_db_file_path(app: tauri::AppHandle) -> Result<String, String> {
    Ok(db_path(&app)?.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            backup_database,
            restore_database,
            get_db_file_path
        ])
        .setup(|app| {
            let _ = db_path(&app.handle());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Gold Ledger");
}
