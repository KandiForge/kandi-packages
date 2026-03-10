use serde::Deserialize;
use tauri::Emitter;

// ---------------------------------------------------------------------------
// Command arguments
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct StartOAuthArgs {
    pub provider: Option<String>,
}

// ---------------------------------------------------------------------------
// Tauri commands
// ---------------------------------------------------------------------------

/// Build the OAuth URL and open it in the user's default browser.
#[tauri::command]
pub fn start_oauth(
    app: tauri::AppHandle,
    provider: Option<String>,
) -> Result<(), String> {
    let base_url = "https://kandi-packages-api.vercel.app";
    let login_path = "/api/mobile/login";
    let deep_link_scheme = "kandi-example";

    let return_url = format!("{}://auth/callback", deep_link_scheme);

    let mut url = url::Url::parse(&format!("{}{}", base_url, login_path))
        .map_err(|e| format!("Failed to parse URL: {}", e))?;

    url.query_pairs_mut()
        .append_pair("return_url", &return_url);

    if let Some(ref p) = provider {
        url.query_pairs_mut().append_pair("provider", p);
    }

    let url_string = url.to_string();
    log::info!("Opening OAuth URL: {}", url_string);

    tauri_plugin_shell::ShellExt::shell(&app)
        .open(&url_string, None)
        .map_err(|e| format!("Failed to open browser: {}", e))?;

    Ok(())
}

/// Read a token from the OS keychain.
#[tauri::command]
pub fn get_token(service: String, key: String) -> Option<String> {
    let entry = keyring::Entry::new(&service, &key).ok()?;
    entry.get_password().ok()
}

/// Store a token in the OS keychain.
#[tauri::command]
pub fn store_token(service: String, key: String, value: String) -> Result<(), String> {
    let entry = keyring::Entry::new(&service, &key)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;
    entry
        .set_password(&value)
        .map_err(|e| format!("Failed to store token: {}", e))?;
    Ok(())
}

/// Delete all tokens for a service from the OS keychain.
#[tauri::command]
pub fn clear_tokens(service: String) -> Result<(), String> {
    let keys = ["access_token", "refresh_token"];
    for key in &keys {
        if let Ok(entry) = keyring::Entry::new(&service, key) {
            // Ignore errors — the entry may not exist.
            let _ = entry.delete_credential();
        }
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// Deep link handler
// ---------------------------------------------------------------------------

/// Parse a deep link URL and extract OAuth tokens.
fn parse_oauth_callback(url_str: &str) -> Option<OAuthCallbackPayload> {
    let parsed = url::Url::parse(url_str).ok()?;

    let mut access_token: Option<String> = None;
    let mut refresh_token: Option<String> = None;
    let mut error: Option<String> = None;

    for (k, v) in parsed.query_pairs() {
        match k.as_ref() {
            "access_token" => access_token = Some(v.into_owned()),
            "refresh_token" => refresh_token = Some(v.into_owned()),
            "error" => error = Some(v.into_owned()),
            _ => {}
        }
    }

    Some(OAuthCallbackPayload {
        access_token,
        refresh_token,
        error,
    })
}

#[derive(Clone, serde::Serialize)]
pub struct OAuthCallbackPayload {
    pub access_token: Option<String>,
    pub refresh_token: Option<String>,
    pub error: Option<String>,
}

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_deep_link::init())
        .setup(|app| {
            #[cfg(any(target_os = "linux", all(debug_assertions, windows)))]
            {
                use tauri_plugin_deep_link::DeepLinkExt;
                let _ = app.deep_link().register_all();
            }

            let handle = app.handle().clone();
            app.listen("deep-link://new-url", move |event| {
                let payload_str = event.payload();
                log::info!("Deep link received: {}", payload_str);

                // The payload is a JSON array of URL strings.
                if let Ok(urls) = serde_json::from_str::<Vec<String>>(payload_str) {
                    for url in urls {
                        if let Some(callback) = parse_oauth_callback(&url) {
                            let _ = handle.emit("oauth-callback", callback);
                        }
                    }
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            start_oauth,
            get_token,
            store_token,
            clear_tokens,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
