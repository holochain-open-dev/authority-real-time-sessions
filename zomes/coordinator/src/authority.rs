use hc_zome_real_time_sessions_integrity::*;
use hdk::prelude::*;

use crate::{all_sessions_path, message::SessionMessage, Signals};

#[hdk_extern]
pub fn create_session(session_info: Option<SerializedBytes>) -> ExternResult<Record> {
    let action_hash = create_entry(EntryTypes::Session(Session { session_info }))?;

    create_link(
        all_sessions_path().path_entry_hash()?,
        action_hash.clone(),
        LinkTypes::PathToSessions,
        (),
    )?;

    let record = get(action_hash, GetOptions::default())?;

    record.ok_or(wasm_error!(WasmErrorInner::Guest(String::from(
        "Could not get the record created just now"
    ))))
}

#[derive(Serialize, Deserialize, Debug)]
pub struct JoinSessionRequestNotice {
    session_hash: ActionHash,
    participant: AgentPubKey,
}

#[hdk_extern]
pub fn receive_join_session_request(session_hash: ActionHash) -> ExternResult<()> {
    let notice = JoinSessionRequestNotice {
        session_hash,
        participant: call_info()?.provenance,
    };

    emit_signal(Signals::JoinSessionRequest(notice))?;

    Ok(())
}

#[derive(Serialize, Deserialize, Debug)]
pub struct LeaveSessionNotice {
    session_hash: ActionHash,
    participant: AgentPubKey,
}

#[hdk_extern]
pub fn receive_leave_session_notice(session_hash: ActionHash) -> ExternResult<()> {
    let notice = LeaveSessionNotice {
        session_hash,
        participant: call_info()?.provenance,
    };

    emit_signal(Signals::LeaveSessionNotice(notice))?;

    Ok(())
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CloseSessionInput {
    session_hash: ActionHash,
    active_participants: Vec<AgentPubKey>,
}

#[hdk_extern]
pub fn close_session(input: CloseSessionInput) -> ExternResult<()> {
    let path = all_sessions_path();

    let links = get_links(path.path_entry_hash()?, LinkTypes::PathToSessions, None)?;

    let session_links: Vec<Link> = links
        .into_iter()
        .filter(|link| {
            input
                .session_hash
                .eq(&ActionHash::from(link.target.clone()))
        })
        .collect();

    for link in session_links {
        delete_link(link.create_link_hash)?;
    }

    for participant in input.active_participants {
        call_remote(
            participant.clone(),
            zome_info()?.name,
            "receive_close_session_notice".into(),
            None,
            input.session_hash.clone(),
        )?;
    }

    Ok(())
}

#[derive(Serialize, Deserialize, Debug)]
pub struct BroadcastMessageInput {
    participants: Vec<AgentPubKey>,
    message: SessionMessage,
}

#[hdk_extern]
pub fn broadcast_message_to_participants(input: BroadcastMessageInput) -> ExternResult<()> {
    remote_signal(ExternIO::encode(input.message), input.participants)?;

    Ok(())
}

#[derive(Serialize, Deserialize, Debug)]
pub struct SendMessageToParticipant {
    participant: AgentPubKey,
    message: SessionMessage,
}
#[hdk_extern]
pub fn send_message_to_participant(input: SendMessageToParticipant) -> ExternResult<()> {
    remote_signal(ExternIO::encode(input.message), vec![input.participant])?;

    Ok(())
}
