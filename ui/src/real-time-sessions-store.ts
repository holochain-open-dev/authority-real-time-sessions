import { CellClient } from '@holochain-open-dev/cell-client';
import { Record } from '@holochain/client';
import { derived, Readable, Writable, writable } from 'svelte/store';
import { AuthoritySessionStore } from './authority-session-store';
import { RealTimeSessionsClient } from './client';
import { ParticipantSessionStore } from './participant-session-store';

export class RealTimeSessionsStore<A2P = any, P2A = any> {
  client: RealTimeSessionsClient;

  activeSessions: Writable<Record[]> = writable([]);

  constructor(cellClient: CellClient, zomeName: string) {
    this.client = new RealTimeSessionsClient(cellClient, zomeName);
  }

  createSession(
    sessionInfo: any | undefined
  ): Promise<AuthoritySessionStore<A2P, P2A>> {
    return AuthoritySessionStore.createSession(this.client, sessionInfo);
  }

  async fetchActiveSessions(): Promise<Readable<Array<Record>>> {
    const sessions = await this.client.getActiveSessions();

    this.activeSessions.set(sessions);

    return derived(this.activeSessions, i => i);
  }

  joinSession(
    sessionInfo: any | undefined
  ): Promise<ParticipantSessionStore<A2P, P2A>> {
    return ParticipantSessionStore.joinSession(this.client, sessionInfo);
  }
}
