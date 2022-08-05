use hc_zome_real_time_sessions_integrity::*;
use hdk::prelude::*;

use crate::{all_sessions_path, message::SessionMessage, Signals};

#[hdk_extern]
pub fn get_active_sessions(_: ()) -> ExternResult<Vec<Record>> {
    let path = all_sessions_path();

    let links = get_links(path.path_entry_hash()?, LinkTypes::PathToSessions, None)?;

    let sessions_get_inputs = links
        .into_iter()
        .map(|l| GetInput::new(AnyDhtHash::from(l.target), GetOptions::default()))
        .collect();

    let maybe_sessions_vec = HDK.with(|h| h.borrow().get(sessions_get_inputs))?;
    let sessions_vec: Vec<Record> = maybe_sessions_vec.into_iter().filter_map(|r| r).collect();

    Ok(sessions_vec)
}

#[hdk_extern]
pub fn join_session(session_hash: ActionHash) -> ExternResult<Record> {
    let session_record = get(session_hash.clone(), GetOptions::default())?.ok_or(wasm_error!(
        WasmErrorInner::Guest("Can't get the given session hash".into())
    ))?;

    let authority = session_record.action().author();

    let response = call_remote(
        authority.clone(),
        zome_info()?.name,
        "request_join_session".into(),
        None,
        session_hash,
    )?;

    match response {
        ZomeCallResponse::Ok(_) => Ok(session_record),
        _ => Err(wasm_error!(WasmErrorInner::Guest(format!(
            "Error joining the session: {:?}",
            response
        )))),
    }
}

#[hdk_extern]
pub fn leave_session(session_hash: ActionHash) -> ExternResult<()> {
    let session_record = get(session_hash.clone(), GetOptions::default())?.ok_or(wasm_error!(
        WasmErrorInner::Guest("Can't get the given session hash".into())
    ))?;

    let authority = session_record.action().author();

    let response = call_remote(
        authority.clone(),
        zome_info()?.name,
        "receive_leave_session_notice".into(),
        None,
        session_hash,
    )?;

    match response {
        ZomeCallResponse::Ok(_) => Ok(()),
        _ => Err(wasm_error!(WasmErrorInner::Guest(format!(
            "Error leaving the session: {:?}",
            response
        )))),
    }
}

#[hdk_extern]
pub fn receive_close_session_notice(session_hash: ActionHash) -> ExternResult<()> {
    let notice = Signals::SessionClosedNotice(session_hash);

    emit_signal(notice)?;

    Ok(())
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SendMessageToAutority {
    authority: AgentPubKey,
    message: SessionMessage,
}

#[hdk_extern]
pub fn send_message_to_authority(input: SendMessageToAutority) -> ExternResult<()> {
    remote_signal(ExternIO::encode(input.message), vec![input.authority])?;

    Ok(())
}
