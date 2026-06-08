import "server-only";

type TaskStreamSend = (payload: string) => void;
type TaskStreamOnClose = () => void;

type TaskStreamConnection = {
  onClose: TaskStreamOnClose;
  send: TaskStreamSend;
};

type GlobalTaskStreamState = {
  taskStreamConnectionsByUserId?: Map<string, Map<string, TaskStreamConnection>>;
};

const globalTaskStream = globalThis as typeof globalThis & GlobalTaskStreamState;

function getTaskStreamConnectionsByUserId() {
  if (!globalTaskStream.taskStreamConnectionsByUserId) {
    globalTaskStream.taskStreamConnectionsByUserId = new Map();
  }

  return globalTaskStream.taskStreamConnectionsByUserId;
}

export function formatTaskSnapshotEvent(data: unknown) {
  return `event: snapshot\ndata: ${JSON.stringify(data)}\n\n`;
}

export function registerTaskStreamConnection(
  userId: string,
  send: TaskStreamSend,
  onClose: TaskStreamOnClose,
) {
  const connectionsByUserId = getTaskStreamConnectionsByUserId();
  const userConnections = connectionsByUserId.get(userId) ?? new Map<string, TaskStreamConnection>();
  const connectionId = crypto.randomUUID();

  userConnections.set(connectionId, { onClose, send });
  connectionsByUserId.set(userId, userConnections);

  let isClosed = false;

  return () => {
    if (isClosed) {
      return;
    }

    isClosed = true;

    const currentUserConnections = connectionsByUserId.get(userId);
    const connection = currentUserConnections?.get(connectionId);

    currentUserConnections?.delete(connectionId);

    if (currentUserConnections?.size === 0) {
      connectionsByUserId.delete(userId);
    }

    connection?.onClose();
  };
}

export async function broadcastTaskSnapshotToUser(userId: string) {
  const connectionsByUserId = getTaskStreamConnectionsByUserId();
  const userConnections = connectionsByUserId.get(userId);

  if (!userConnections || userConnections.size === 0) {
    return;
  }

  const { listTasksByUserId } = await import("@/lib/tasks");
  const tasks = await listTasksByUserId(userId);
  const payload = formatTaskSnapshotEvent(tasks);

  for (const [connectionId, connection] of userConnections.entries()) {
    try {
      connection.send(payload);
    } catch {
      userConnections.delete(connectionId);
      connection.onClose();
    }
  }

  if (userConnections.size === 0) {
    connectionsByUserId.delete(userId);
  }
}
