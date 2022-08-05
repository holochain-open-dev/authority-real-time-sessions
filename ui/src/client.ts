import { CellClient } from '@holochain-open-dev/cell-client';
import { ActionHash, Record } from '@holochain/client';
import {
  BroadcastMessageInput,
  SendMessageToAutority,
  SendMessageToParticipant,
} from './types';

export class RealTimeSessionsClient {
  constructor(
    public cellClient: CellClient,
    protected zomeName = 'real_time_sessions'
  ) {}

  /** Authority */
  createSession(info?: Uint8Array): Promise<Record> {
    return this.callZome('create_session', info);
  }

  closeSession(session_hash: ActionHash): Promise<void> {
    return this.callZome('close_session', session_hash);
  }

  broadcastMessageToParticipants(input: BroadcastMessageInput): Promise<void> {
    return this.callZome('broadcast_message_to_participants', input);
  }

  sendMessageToParticipant(input: SendMessageToParticipant): Promise<void> {
    return this.callZome('send_message_to_participant', input);
  }

  /** Participants */

  joinSession(session_hash: ActionHash): Promise<Record> {
    return this.callZome('join_session', session_hash);
  }

  leaveSession(action_hash: ActionHash): Promise<void> {
    return this.callZome('leave_session', action_hash);
  }

  sendMessageToAuthority(input: SendMessageToAutority): Promise<void> {
    return this.callZome('send_message_to_authority', input);
  }

  getActiveSessions(): Promise<Array<Record>> {
    return this.callZome('get_active_sessions', null);
  }

  /** Helpers */
  private async callZome(fnName: string, payload: any): Promise<any> {
    return this.cellClient.callZome(this.zomeName, fnName, payload);
  }
}
