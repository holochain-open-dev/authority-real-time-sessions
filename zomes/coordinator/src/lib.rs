use authority::{JoinSessionRequestNotice, LeaveSessionNotice};
use hdk::prelude::*;
use message::{MessageReceivedNotice, SessionMessage};

mod authority;
mod message;
mod participant;

fn all_sessions_path() -> Path {
    Path::from("all_sessions")
}

#[hdk_extern]
pub fn init(_: ()) -> ExternResult<InitCallbackResult> {
    let mut functions = BTreeSet::new();
    functions.insert((zome_info()?.name, FunctionName("recv_remote_signal".into())));
    let cap_grant_entry: CapGrantEntry = CapGrantEntry::new(
        String::from("remote signals"), // A string by which to later query for saved grants.
        ().into(), // Unrestricted access means any external agent can call the extern
        functions,
    );
    create_cap_grant(cap_grant_entry)?;

    let mut functions = BTreeSet::new();
    functions.insert((
        zome_info()?.name,
        FunctionName("receive_join_request".into()),
    ));
    let cap_grant_entry: CapGrantEntry = CapGrantEntry::new(
        String::from("receive join request"), // A string by which to later query for saved grants.
        ().into(), // Unrestricted access means any external agent can call the extern
        functions,
    );
    create_cap_grant(cap_grant_entry)?;

    let mut functions = BTreeSet::new();
    functions.insert((
        zome_info()?.name,
        FunctionName("receive_leave_session_notice".into()),
    ));
    let cap_grant_entry: CapGrantEntry = CapGrantEntry::new(
        String::from("receive leave notice"), // A string by which to later query for saved grants.
        ().into(), // Unrestricted access means any external agent can call the extern
        functions,
    );
    create_cap_grant(cap_grant_entry)?;

    Ok(InitCallbackResult::Pass)
}



#[derive(Serialize, Deserialize, Debug)]
#[serde(tag = "type", content = "payload")]
pub enum Signals {
    JoinSessionRequest(JoinSessionRequestNotice),
    MessageReceived(MessageReceivedNotice),
    LeaveSessionNotice(LeaveSessionNotice),
    SessionClosedNotice(ActionHash),
}

#[hdk_extern]
pub fn recv_remote_signal(signal: ExternIO) -> ExternResult<()> {
    let message: SessionMessage = signal
        .decode()
        .map_err(|err| wasm_error!(WasmErrorInner::Guest(err.into())))?;

    let info = call_info()?;

    let notice = MessageReceivedNotice {
        message,
        provenance: info.provenance,
    };

    emit_signal(notice)
}
