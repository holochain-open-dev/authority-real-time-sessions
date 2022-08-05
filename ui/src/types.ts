import { ActionHash, AgentPubKey } from '@holochain/client';

export interface Session {
  session_info: Uint8Array | undefined;
}

export interface SessionMessage {
  session_hash: ActionHash;
  message: Uint8Array;
}

export interface BroadcastMessageInput {
  participants: Array<AgentPubKey>;
  message: SessionMessage;
}

export interface SendMessageToParticipant {
  participant: AgentPubKey;
  message: SessionMessage;
}

export interface SendMessageToAutority {
  authority: AgentPubKey;
  message: SessionMessage;
}
