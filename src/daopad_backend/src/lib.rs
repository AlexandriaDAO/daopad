mod orbit_integration;

#[ic_cdk::init]
fn init(orbit_control_panel_id: Option<String>) {
    orbit_integration::init_control_panel(orbit_control_panel_id);
}

#[ic_cdk::query]
fn get_orbit_control_panel_id() -> String {
    orbit_integration::get_control_panel_id()
}

#[ic_cdk::update]
fn set_orbit_control_panel_id(canister_id: String) {
    orbit_integration::init_control_panel(Some(canister_id));
}

#[ic_cdk::update]
async fn register_with_orbit() -> Result<String, String> {
    orbit_integration::register_with_orbit().await
}

#[ic_cdk::update]
async fn create_dao_treasury(dao_name: String) -> Result<String, String> {
    let treasury_name = format!("{} Treasury", dao_name);
    
    let station_id = orbit_integration::open_station(treasury_name).await?;
    Ok(station_id.to_text())
}

#[ic_cdk::update]
async fn get_orbit_stations() -> Result<Vec<(String, String)>, String> {
    let stations = orbit_integration::query_stations().await?;
    Ok(stations.into_iter()
        .map(|(id, name)| (id.to_text(), name))
        .collect())
}