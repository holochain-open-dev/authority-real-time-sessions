import { ActionHash, Record } from '@holochain/client';
import { decode, encode } from '@msgpack/msgpack';
import { isEqual } from 'lodash-es';
import { Unsubscriber } from 'svelte/store';
import { RealTimeSessionsClient } from './client';

export class ParticipantSessionStore<A2P = any, P2A = any> {
  messageHandlers: Array<(m: A2P) => void> = [];
  sessionClosedNoticeHandlers: Array<() => void> = [];

  unsubscribe: Unsubscriber;

  private constructor(
    protected client: RealTimeSessionsClient,
    public sessionRecord: Record
  ) {
    const { unsubscribe } = client.cellClient.addSignalHandler(signal => {
      const signalType = signal.data.payload.type;

      if (
        signalType === 'MessageReceived' &&
        isEqual(
          signal.data.payload.payload.message.session_hash,
          this.sessionHash
        )
      ) {
        const message = decode(signal.data.payload.message.message) as A2P;
        for (const h of this.messageHandlers) {
          h(message);
        }
      } else if (
        signalType === 'SessionClosedNotice' &&
        isEqual(signal.data.payload.payload, this.sessionHash)
      ) {
        this.unsubscribe();
      }
    });
    this.unsubscribe = unsubscribe;
  }

  static async joinSession(
    client: RealTimeSessionsClient,
    sessionHash: ActionHash
  ): Promise<ParticipantSessionStore> {
    const sessionRecord = await client.joinSession(sessionHash);

    return new ParticipantSessionStore(client, sessionRecord);
  }

  get sessionHash() {
    return this.sessionRecord.signed_action.hashed.hash;
  }

  get sessionAuthority() {
    return this.sessionRecord.signed_action.hashed.content.author;
  }

  leaveSession() {
    return this.client.leaveSession(this.sessionHash);
  }

  async sendMessageToAuthority(message: P2A) {
    const encodedMesage = encode(message);

    await this.client.sendMessageToAuthority({
      message: {
        session_hash: this.sessionHash,
        message: encodedMesage,
      },
      authority: this.sessionAuthority,
    });
  }

  onAuthorityMessageReceived(handler: (m: A2P) => void) {
    this.messageHandlers.push(handler);

    return {
      unsubscribe: () => {
        const index = this.messageHandlers.findIndex(h => h === handler);
        this.messageHandlers.splice(index, 1);
      },
    };
  }

  onSessionClosedNotice(handler: () => void) {
    this.sessionClosedNoticeHandlers.push(handler);

    return {
      unsubscribe: () => {
        const index = this.sessionClosedNoticeHandlers.findIndex(
          h => h === handler
        );
        this.sessionClosedNoticeHandlers.splice(index, 1);
      },
    };
  }
}
