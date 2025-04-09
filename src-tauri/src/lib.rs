use tauri::Emitter;
use tauri_plugin_deep_link::DeepLinkExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        // Configure single instance plugin with deep-link feature
        builder = builder.plugin(tauri_plugin_single_instance::init(|_app, argv, _cwd| {
            println!("a new app instance was opened with {argv:?} and the deep link event was already triggered");
            // You would need to manually check argv if using runtime-defined schemes
        }));
    }

    builder = builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Store the app handle for later use with deep links
            let app_handle = app.handle().clone();

            // Listen to deep link events
            app.deep_link().on_open_url(move |event| {
                let urls = event.urls();
                println!("Deep link event received: {:?}", urls);
                for url in urls {
                    app_handle.emit("deep-link", url).unwrap();
                }
            });

            // Always register the deep link scheme, not just in debug mode
            #[cfg(desktop)]
            {
                match app.deep_link().register("statisfy") {
                    Ok(_) => println!("Registered statisfy:// protocol handler"),
                    Err(err) => eprintln!("Failed to register protocol handler: {}", err),
                }
            }

            Ok(())
        });

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
