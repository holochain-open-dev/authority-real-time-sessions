import { AgentPubKey, Record } from '@holochain/client';
import { decode, encode } from '@msgpack/msgpack';
import { RealTimeSessionsClient } from './client';
import { get, Unsubscriber, Writable, writable } from 'svelte/store';
import { AgentPubKeyMap } from '@holochain-open-dev/utils';
import { isEqual } from 'lodash-es';

export class AuthoritySessionStore<A2P = any, P2A = any> {
  messageHandlers: Array<(m: P2A) => void> = [];
  leaveSessionNoticeHandlers: Array<(participant: AgentPubKey) => void> = [];

  participants = writable(new AgentPubKeyMap<number>());

  unsubscribe: Unsubscriber;

  private constructor(
    protected client: RealTimeSessionsClient,
    public sessionRecord: Record
  ) {
    const { unsubscribe } = client.cellClient.addSignalHandler(signal => {
      const signalType = signal.data.payload.type;

      if (
        signalType === 'JoinSessionRequest' &&
        isEqual(signal.data.payload.payload.session_hash, this.sessionHash)
      ) {
        this.participants.update(p => {
          p.put(signal.data.payload.payload.participant, {});
          return p;
        });
      } else if (
        signalType === 'MessageReceived' &&
        isEqual(
          signal.data.payload.payload.message.session_hash,
          this.sessionHash
        )
      ) {
        const message = decode(signal.data.payload.message.message) as P2A;
        for (const h of this.messageHandlers) {
          h(message);
        }
      } else if (
        signalType === 'LeaveSessionNotice' &&
        isEqual(signal.data.payload.payload.session_hash, this.sessionHash)
      ) {
        this.participants.update(p => {
          p.delete(signal.data.payload.payload.participant);
          return p;
        });
      }
    });
    this.unsubscribe = unsubscribe;
  }

  static async createSession(
    client: RealTimeSessionsClient,
    sessionInfo?: any
  ): Promise<AuthoritySessionStore> {
    let encoded: Uint8Array | undefined = undefined;
    if (sessionInfo) {
      encoded = encode(sessionInfo);
    }
    const sessionRecord = await client.createSession(encoded);

    return new AuthoritySessionStore(client, sessionRecord);
  }

  get sessionHash() {
    return this.sessionRecord.signed_action.hashed.hash;
  }

  async closeSession() {
    await this.client.closeSession(this.sessionHash);
    this.unsubscribe();
  }

  async broadcastMessageToParticipants(message: A2P) {
    const encodedMesage = encode(message);

    await this.client.broadcastMessageToParticipants({
      message: {
        session_hash: this.sessionHash,
        message: encodedMesage,
      },
      participants: get(this.participants).keys(),
    });
  }

  async sendMessageToParticipant(message: A2P, participant: AgentPubKey) {
    const encodedMesage = encode(message);

    await this.client.sendMessageToParticipant({
      message: {
        session_hash: this.sessionHash,
        message: encodedMesage,
      },
      participant,
    });
  }

  onParticipantMessageReceived(handler: (m: P2A) => void) {
    this.messageHandlers.push(handler);

    return {
      unsubscribe: () => {
        const index = this.messageHandlers.findIndex(h => h === handler);
        this.messageHandlers.splice(index, 1);
      },
    };
  }

  onParticipantLeaveSessionNotice(handler: (participant: AgentPubKey) => void) {
    this.leaveSessionNoticeHandlers.push(handler);

    return {
      unsubscribe: () => {
        const index = this.leaveSessionNoticeHandlers.findIndex(
          h => h === handler
        );
        this.leaveSessionNoticeHandlers.splice(index, 1);
      },
    };
  }
}
