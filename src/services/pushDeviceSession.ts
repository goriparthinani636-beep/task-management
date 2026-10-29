// Account change and logout madhya device token registration safe ga manage chesthundi.
type Session = { userId: number; accessToken: string };
type Dependencies = {
  getPushToken: (askPermission: boolean) => Promise<string | null>;
  getSession: () => Promise<Session>;
  readToken: () => Promise<string | null>;
  writeToken: (token: string | null) => Promise<void>;
  register: (token: string, session: Session) => Promise<void>;
  unregister: (token: string, session: Session) => Promise<void>;
  onStatus: (message: string) => void;
};

// Native permission prompts can finish after logout. Only the current account
// may use the result, and remote writes are serialized across account switches.
export function createPushDeviceSession(deps: Dependencies) {
  let userId: number | null = null;
  let generation = 0;
  let networkQueue: Promise<void> = Promise.resolve();
  let pending: { generation: number; promise: Promise<void> } | null = null;
  const activate = (id: number) => {
    userId = id;
    generation++;
  };
  const stop = () => {
    userId = null;
    generation++;
  };
  const sync = (askPermission = false): Promise<void> => {
    if (userId === null) return Promise.resolve();
    const epoch = generation;
    const owner = userId;
    if (pending?.generation === epoch) return pending.promise;
    const current = () => epoch === generation && owner === userId;
    const promise = (async () => {
      try {
        const pushToken = await deps.getPushToken(askPermission);
        if (!current()) return;
        const session = await deps.getSession();
        if (!current() || session.userId !== owner) return;
        const operation = networkQueue
          .catch(() => {})
          .then(async () => {
            if (!current()) return;
            const previous = await deps.readToken();
            if (!current()) return;
            if (previous && previous !== pushToken)
              await deps.unregister(previous, session);
            if (!current()) return;
            if (!pushToken) {
              await deps.writeToken(null);
              if (current())
                deps.onStatus(
                  'Notifications are off. Enable permission in your phone settings.',
                );
              return;
            }
            await deps.register(pushToken, session);
            if (!current()) return;
            await deps.writeToken(pushToken);
            if (current()) deps.onStatus('Task notifications are enabled.');
          });
        networkQueue = operation;
        await operation;
      } catch {
        if (current())
          deps.onStatus(
            'Notifications could not be registered. Check your connection and try again.',
          );
      }
    })();
    pending = { generation: epoch, promise };
    void promise.finally(() => {
      if (pending?.promise === promise) pending = null;
    });
    return promise;
  };
  return { activate, stop, sync };
}
